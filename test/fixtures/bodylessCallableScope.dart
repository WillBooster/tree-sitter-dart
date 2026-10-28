void target() {}
external void externalCall(void callback(int target));
abstract class Contract {
  void declared(void callback(int target));
  void operator +(void callback(int target));
  set setter(void Function() target);
  void Function(int target) get getter;
  void other() { target(); }
}
void after() { target(); externalCall((target) {}); }
void main() { target(); }
