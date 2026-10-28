int _() => 7;
void T() {}
void U() {}
int positional(int _) => _();
int optional([int _ = 9]) => _();
T generic<T, _, U>(T value) { _(); return value; }
class Ordinary {
  Ordinary(int _) { _(); }
  set value(int _) { _(); }
  Ordinary operator +(int _) { _(); return this; }
}
class Primary(int _) {
  final value = _();
  this { _(); }
}
class Declared(final int Function() _) { int use() => _(); }
class Initializing(this._) {
  final int Function() _;
  int use() => _();
}
extension type Representation(int Function() _) { int use() => _(); }
void main() {
  var _ = 9;
  final _ = 9;
  var first = 1, _ = 9;
  _();
  var i = 0;
  for (var _ = 9; i++ < 1;) { _(); }
  for (var _ in [9]) { _(); }
  var callback = (int _) => _();
  positional(9); optional(); generic<int, Object, String>(1);
  Ordinary(9)..value = 9;
  Ordinary(9) + 9;
  Primary(9);
  assert(Declared(() => 9).use() == 9);
  assert(Initializing(() => 9).use() == 9);
  assert(Representation(() => 9).use() == 9);
  callback(9); print(first); T(); U();
}
