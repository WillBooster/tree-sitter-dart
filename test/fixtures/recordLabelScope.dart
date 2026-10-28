int item() => 1;
void inspect() {
  final record = (item:item(),);
  final multiple = (first:item(),item:item());
  print(multiple.first);
  try { print(record.item); } catch (error) { rethrow; }
}
void main() { inspect(); }
