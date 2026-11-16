declare namespace React {
  type ReactNode = any;
  type ReactElement<P = any, T = any> = {
    type: T;
    props: P;
    key: any;
  };
  type FC<P = {}> = ((props: P) => any) & { displayName?: string };
  type ComponentType<P = {}> = any;
}
