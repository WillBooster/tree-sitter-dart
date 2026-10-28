List<int Function()> a() => [() => 1];
void main() {
  for (final a in a()) { print(a()); }a();
  final values = [for (final a in a()) a()];
  for (final a in a()..add(a().first)) { print(a()); }
  final cascaded = [for (final a in a()..add(a().first)) a()];
  for (final a in a()..add(((int Function() a) => () => a())(() => 1))) { print(a()); }
  final lambda = [for (final a in a()..add(((int Function() a) => () => a())(() => 1))) a()];
  for (final _ in a()) { a(); }
  for (final _value in a()) { _value(); }
  a();
  print([values, cascaded]);
}
