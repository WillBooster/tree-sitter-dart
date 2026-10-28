int Function() _ = () => 7;
abstract class Contract {
  int _();
  int invoke() => _();
}
class Member extends Contract { int _() => 9; }
class Field {
  final int Function() _ = () => 9;
  int invoke() { var _ = 0; return _(); }
}
void main() {
  int _() => _();
  print(_());
  print(Member().invoke());
  print(Field().invoke());
}
