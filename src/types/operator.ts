export interface Operator {
  opType: string;
  target?: any;
  value?: any;
  test?: any;
  then?: any;
  else?: any;
  cases?: Array<{value: any, return: any}>;
  default?: any;
  steps?: Operator[];
  [key: string]: any;
}