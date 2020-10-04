
export const conditionalRender = (condition:boolean, markup: JSX.Element) => {
  if(condition) {
    return markup;
  }

  return null;
};