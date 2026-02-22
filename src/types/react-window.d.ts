declare module 'react-window' {
  import { Component, CSSProperties } from 'react';

  export interface ListChildComponentProps<T = any> {
    index: number;
    style: CSSProperties;
    data: T;
  }

  export interface FixedSizeListProps {
    height: number;
    width: number | string;
    itemCount: number;
    itemSize: number;
    itemData?: any;
    overscanCount?: number;
    children: React.ComponentType<ListChildComponentProps>;
    style?: CSSProperties;
  }

  export class FixedSizeList extends Component<FixedSizeListProps> {}
}
