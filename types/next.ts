import { NextPage } from 'next';
import { AppProps } from 'next/app';
import { ReactElement, ReactNode } from 'react';

export type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
  pageProps: Record<string, any>;
};

export type NextPageWithLayout<P = Record<string, unknown>, IP = P> = NextPage<
  P,
  IP
> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

export type NextPageWithUser<P = Record<string, unknown>, IP = P> = NextPage<
  P,
  IP
> & {
  requireAuth: boolean;
};
