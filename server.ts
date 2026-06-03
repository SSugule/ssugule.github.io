import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Setup directories for robust local uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

// Robust file upload endpoint
app.post('/api/upload', express.raw({ type: '*/*', limit: '50mb' }), (req, res) => {
  try {
    const rawFileName = req.header('x-file-name') || '';
    const fileName = decodeURIComponent(rawFileName) || `${Date.now()}.png`;
    
    const fileBuffer = req.body;
    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).send('Empty file payload or missing content-type handler.');
    }

    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, fileBuffer);

    const fileUrl = `/uploads/${fileName}`;
    return res.json({ url: fileUrl });
  } catch (err: any) {
    console.error('Error in /api/upload:', err);
    return res.status(500).send(err.message || 'Error occurred while saving file on server.');
  }
});

// Health check and environment verification (No AI or Gemini)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database_host: 'Express backend active'
  });
});

// Setup dev server or static static assets
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' || 
                 (process.argv[1] && (process.argv[1].includes('dist/server.cjs') || process.argv[1].includes('server.cjs')));

  if (!isProd) {
    // Dynamically import Vite and run its dev server as a request handler
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });

    app.use(vite.middlewares);

    console.log('Running full-stack Express server in DEVELOPMENT mode with Vite middleware.');
  } else {
    // Production static delivery
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));

    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });

    console.log('Running full-stack Express server in PRODUCTION mode with compiled assets.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on absolute port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal startup failure:', err);
});

