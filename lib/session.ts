import type {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from 'next';
import { getCurrentUserWithTeam } from '@/lib/clerk-session';

export const getSession = async (
  req: NextApiRequest | GetServerSidePropsContext['req'],
  res: NextApiResponse | GetServerSidePropsContext['res']
) => {
  const user = await getCurrentUserWithTeam(req as NextApiRequest, res as NextApiResponse);
  
  if (!user) {
    return null;
  }

  // Return user data with team context
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: [{
        teamId: user.team.id,
        role: user.role
      }]
    }
  };
};
