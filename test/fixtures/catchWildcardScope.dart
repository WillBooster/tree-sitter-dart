int _() => 1;
int error() => 99;
void main() {
  try { throw 1; } catch (_) { assert(_() == 1); }
  try { throw 2; } catch (_, _) { assert(_() == 1); }
  try { throw _; } on Function catch (error, _) { assert(error() == 1 && _() == 1); }
  error();
}
