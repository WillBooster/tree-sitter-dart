void a() { print('outer'); }
void f(List<(int, int)> records) {
  final values = [for (var (a, b) in records) a];
  print(values);
  a();
}
void main() { f([(1, 2)]); }
