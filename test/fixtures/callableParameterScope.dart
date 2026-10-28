void target() {}
void T() {}
void hidden() {}
void visible() {}
void oldStyle(void callback(int target)) { target(); callback(1); }
void modern(void Function(int target) callback) { target(); callback(1); }
void mixed(void Function(int hidden) callback(String visible)) {
  hidden();
  visible();
  callback('value')(1);
}
void generic(void Function<T>(T value) callback) { T(); }
void main() {
  oldStyle((target) {});
  modern((target) {});
  mixed((visible) => (hidden) {});
  target();
  hidden();
  visible();
}
