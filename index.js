const express = require('express');
const multer = require('multer');                                                         const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// 📁 Folder to store videos
const VIDEO_FOLDER = path.join(__dirname, 'public/videos');

// 📂 Ensure folder exists
if (!fs.existsSync(VIDEO_FOLDER)) {
  fs.mkdirSync(VIDEO_FOLDER, { recursive: true });
}

// 🎥 Multer config for multiple uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, VIDEO_FOLDER),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max per file
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.mp4', '.webm', '.mov'].includes(ext)) {
      return cb(new Error('Only video files allowed (.mp4, .webm, .mov)'));
    }
    cb(null, true);
  }
});

// 🌐 Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// 📦 Return list of video files
app.get('/api/videos', (req, res) => {
  fs.readdir(VIDEO_FOLDER, (err, files) => {
    if (err) return res.status(500).send('Error reading videos folder');
    const videoFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp4', '.webm', '.mov'].includes(ext);
    });
    res.json(videoFiles);
  });
});

// ⬆️ Multiple upload endpoint
app.post('/upload-multiple', upload.array('videos', 20), (req, res) => {
  console.log('Received files:', req.files);

  if (!req.files || req.files.length === 0) {
    return res.status(400).send('No files uploaded.');
  }

  const uploadedFiles = req.files.map(file => file.filename);
  res.json({ message: '✅ Upload successful', uploaded: uploadedFiles });
});

// 📺 Stream video with range support
app.get('/videos/:name', (req, res) => {
  const filePath = path.join(VIDEO_FOLDER, req.params.name);
  if (!fs.existsSync(filePath)) return res.status(404).send('Video not found');

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    });

    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// ⚠️ Error handler
app.use((err, req, res, next) => {
  console.error('❌ Upload error:', err.message);
  res.status(500).send('Upload failed: ' + err.message);
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`Service is live 😂`);
});
