import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { findManySessions } from 'models/session';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        await handleGET(req, res);
        break;
      default:
        res.setHeader('Allow', 'GET');
        res.status(405).json({
          error: { message: `Method ${req.method} Not Allowed` },
        });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    res.status(status).json({ error: { message } });
  }
}

// Fetch all sessions for the current user
const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getSession(req, res);

  let sessions = await findManySessions({
    where: {
      userId: session?.user.id,
    },
  });

  // With Clerk, we don't have access to the current session token
  // So we'll mark all sessions as not current
  sessions = sessions.map(session => ({
    ...session,
    isCurrent: false
  }));

  // Sort sessions by most recent
  sessions = sessions.sort(
    (a, b) => Number(new Date(b.expires)) - Number(new Date(a.expires))
  );

  res.json({ data: sessions });
};
