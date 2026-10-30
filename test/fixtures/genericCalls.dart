void direct<T>(T value) {}
class Box {
  void member<T>(T value) {}
  static void staticCall<T>(T value) {}
}
void inspect(Box value, Box? nullable) {
  direct<int>(1);
  value.member<int>(1);
  nullable?.member<int>(1);
  Box.staticCall<int>(1);
  final tearOff = direct<int>;
  final memberOff = value.member<int>;
  final nullableOff = (nullable?.member)!<int>;
  final staticOff = Box.staticCall<int>;
  tearOff(1); memberOff(1); nullableOff(1); staticOff(1);
}
void invoke(void Function<T>(T) callback) { callback<int>(1); }
void main() { inspect(Box(), Box()); invoke(direct); }
bool comparisons(int a, int b, int c, int d) => a < b && c > d;
