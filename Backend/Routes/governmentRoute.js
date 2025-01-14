import express  from 'express';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    console.log(req.body)
   
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/signup', async (req, res) => {
  try {
    console.log(req.body)
   
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/unverified-users', async (req, res) => {
  try {
    const users = await RequestUsers.find({ verified: false });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});













export default router
