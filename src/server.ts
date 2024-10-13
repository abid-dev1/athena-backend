import express from 'express';
import dotenv from 'dotenv';
import connection from './db';
import claimRoutes from './routes/claimRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Routes
app.use('/claims', claimRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Close database connection on server shutdown
process.on('SIGTERM', () => {
  connection.destroy();
});
