import 'dart:core';
import 'dart:core' as core;
const named = 1;
const bare = 1;
const newly = 1;
void target() {}
void sink({int field = 0, int callback = 0}) {}
int value() => 1;
class A {
  const A();
  const A.named(int value);
  void unrelated() { value(); }
}
class G<T> { const G.named(); }
const marker = A();
@marker @core.Deprecated('x') @G<int>.named() void annotated() {}
@A() class C {
  int field;
  C(void Function() target) : field = 0 { target(); }
  C.named(int Function() target) : field = target();
  factory C.created(void Function() target) { target(); return C(target); }
  factory C.redirected(void Function() target) = C;
  void unrelated() { target(); }
  bare() {}
  newly() {}
}
void main() {
  final field = 1;
  final object = C(target);
  final unrelated = 1;
  final callback = () => 1;
  C? maybe = object;
  object.unrelated();
  print(maybe?.field);
  maybe?..field;
  sink(field:field);
  sink(callback:callback());
  print(object.field);
  object..field;
  print("${field}");
  print(object is C);
  print(object is! C);
  print(object as C);
}

abstract class Abstract {
  Abstract();
  bare();
}
mixin Mix { bare() {} }
extension on C { bare() {} }
extension type Wrapped.primary(int value) {
  Wrapped(int value) : this.primary(value);
  bare() => value;
}
enum State { ready; bare() {} }

class Adjacent { Adjacent(int target){}Adjacent.named(){target();} }

class Explicit { new(); new named(); bare() {} newly() {} }
