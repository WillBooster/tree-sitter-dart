void hidden() {}
class C {
  final void Function(int) callback;
  C(void this.callback(int hidden)) { hidden(); callback(1); }
  void check() { hidden(); callback(1); }
}
class D extends C {
  D(void super.callback(int hidden)) { hidden(); callback(1); }
  void other() { hidden(); callback(1); }
}
void main() { C((hidden) {}); D((hidden) {}); hidden(); }
