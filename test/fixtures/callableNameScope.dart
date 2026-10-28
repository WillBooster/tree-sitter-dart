void target() {}
void f(int x) { f(x); }
void g(int x) { f(x); }
void main() { f(1); g(2); }
void localFunctions() {
  void nested(void callback(int target)) { target(); callback(1); nested(callback); }
  target(); nested((target) {});
}
