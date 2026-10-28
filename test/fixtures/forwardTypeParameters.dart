void T() {}
void U() {}
T identity<T>(T value) => value;
class Bound<X extends U, U extends num> {}
void callbacks(T callback<T>(U nested<U>(U value), T value)) { T(); U(); }
T Function<T>(T value) modern = identity;
class Parent {
  Parent(T callback<T>(T value)) { T(); }
}
class Child extends Parent {
  Child(T super.callback<T>(T value)) { T(); }
}
void main() { T(); U(); identity(1); Bound<int, int>(); }
