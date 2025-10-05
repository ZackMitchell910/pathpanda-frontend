declare module "html2canvas" {
  const html2canvas: (
    element: HTMLElement | null,
    options?: any
  ) => Promise<HTMLCanvasElement>;
  export default html2canvas;
}
