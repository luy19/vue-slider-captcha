export const getRandomNumberByRange = (start: number, end: number) => {
  return Math.round(Math.random() * (end - start) + start);
};

export const createImageElement = (src: string) => {
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = src;
  return new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => {
      resolve(img);
    };
    img.onerror = (e) => {
      reject(e);
    };
  });
};

export const verifyCaptcha = function (
  trails: number[],
  args: { left: number; x: number; offset: number }
) {
  const sum = (x: number, y: number) => x + y;
  const square = (x: number) => x * x;
  const average = trails.reduce(sum) / trails.length;
  const deviations = trails.map((x) => x - average);
  const stddev = Math.sqrt(deviations.map(square).reduce(sum) / trails.length);
  const verified = stddev !== 0;

  const { left, x, offset } = args;
  const spliced = Math.abs(left - x) < offset;

  return {
    verified,
    spliced,
  };
};
