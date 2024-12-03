export function insert<T>(value: T, array: T[], i: number = 0) {
  array.length++;
  for (let j = array.length - 1; j > i; --j) {
    array[j] = array[j - 1];
  }
  array[i] = value;
}

export function insertSorted<T>(
  value: T,
  array: T[],
  compare: (a: T, b: T) => number,
): void {
  let inserted = false;
  for (let i = 0; i < array.length; ++i) {
    if (compare(value, array[i]) >= 0) {
      insert(value, array, i);
      inserted = true;
      break;
    }
  }
  if (!inserted) {
    array.push(value);
  }
}

export function removeAt<T>(i: number, array: T[]) {
  for (let j = i; j < array.length - 1; ++j) {
    array[j] = array[j + 1];
  }
  array.length--;
}

export function remove<T>(value: T, array: T[]) {
  const i = array.indexOf(value);
  if (i >= 0) {
    removeAt(i, array);
  }
}
