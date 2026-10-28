typedef _ = int;
void T() {}
void U() {}
typedef (T, _, U) Legacy<T, _, U>(T first, U third);
typedef Modern<_> = _ Function();
_ produce() => 7;
void main() {
  Legacy<String, Object, double> record = (first, third) => (first, 7, third);
  Modern<double> value = produce;
  assert(record('text', 1.0).$2 == 7 && value() == 7);
  T(); U();
}
