declare module 'react-window' {
  import { Component, CSSProperties } from 'react';

  export interface ListChildComponentProps<T = any> {
    index: number;
    style: CSSProperties;
    data: T;
  }

  export class List extends Component<any> {}
  export class Grid extends Component<any> {}
  export function getScrollbarSize(): number;
  export function useDynamicRowHeight(): any;
  export function useGridCallbackRef(): any;
  export function useGridRef(): any;
  export function useListCallbackRef(): any;
  export function useListRef(): any;
}
