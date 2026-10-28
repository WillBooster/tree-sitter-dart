int target() { print('global'); return 10; }
class PC(int Function() target) {
  final int stored;
  this : stored = target() { target(); }
  void m() { target(); }
}
class PF(final int Function() target) {
  void m() { target(); }
}
class PT(this.target) {
  final int Function() target;
  void m() { target(); }
}
enum E(int target) {
  value(1);
  final int stored;
  this : stored = target;
  void m() { target(); }
}
extension type ET(int Function() target) {
  void m() { target(); }
}
void main() {
  PC(() { print('primary parameter'); return 1; }).m();
  PF(() { print('declared field'); return 2; }).m();
  PT(() { print('this field'); return 4; }).m();
  E.value.m();
  ET(() { print('representation field'); return 3; }).m();
}
