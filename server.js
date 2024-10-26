const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3'); // Import S3 Client and Command
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure AWS S3
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Set up multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Serve the HTML file at the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Upload endpoint to S3
app.post('/upload', upload.array('files', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const uploadPromises = req.files.map(async (file) => {
    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: file.originalname, // Keep the original file name
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    try {
      const command = new PutObjectCommand(params);
      await s3.send(command); // Send the command to S3
    } catch (err) {
      throw new Error(`Error uploading file ${file.originalname}: ${err.message}`);
    }
  });

  try {
    await Promise.all(uploadPromises);
    res.send(`Uploaded ${req.files.length} files successfully.`);
  } catch (err) {
    res.status(500).send(`Error uploading files: ${err.message}`);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
