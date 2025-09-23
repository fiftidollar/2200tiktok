export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const userResponse = await fetch('https://open.tiktokapis.com/v2/user/info/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const userData = await userResponse.json();
    res.status(200).json(userData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
}