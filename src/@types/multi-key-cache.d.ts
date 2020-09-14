declare module 'multi-key-cache' {

  export default class MultiKeyCache<K, V> {
    get: (key: K) => V;
    set: (key: K, value: V) => void;
  }
}