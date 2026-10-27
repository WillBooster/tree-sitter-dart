List<(int Function(), int)> a() => [(() => 1, 2)];
void main() {
  for (var (a, b) in a()) { print(a() + b); }a();
  final values = [for (var (a, b) in a()) a() + b];
  for (var (a, b) in a()..add(a().first)) { print(a() + b); }
  final cascaded = [for (var (a, b) in a()..add(a().first)) a() + b];
  for (var (a, b) in a()..add(((int Function() a) => (() => a(), 2))(() => 1))) { print(a() + b); }
  final lambda = [for (var (a, b) in a()..add(((int Function() a) => (() => a(), 2))(() => 1))) a() + b];
  a();
  print([values, cascaded, lambda]);
}
