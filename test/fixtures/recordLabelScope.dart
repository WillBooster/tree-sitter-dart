int item() => 1;
class Box { final int item; Box(this.item); }
void inspect() {
  final record = (item:item(),);
  final multiple = (first:item(),item:item());
  print(multiple.first);
  var (item:single,) = record;
  var (first:firstValue,item:secondValue) = multiple;
  var Box(item:boxed) = Box(3);
  switch (record) { case (item:var matched,): print(matched); }
  switch (Box(4)) { case Box(item:var objectMatch): print(objectMatch); }
  print([single, firstValue, secondValue, boxed]);
  try { print(record.item); } catch (error) { rethrow; }
}
class CallableBox { final int Function() item; CallableBox(this.item); }
void shorthand() {
  final callable = (item:() => 1,);
  { var (:item,) = callable; print(item()); }
  { var CallableBox(:item) = CallableBox(() => 2); print(item()); }
  switch (callable) { case (:var item,): print(item()); }
  switch (CallableBox(() => 3)) { case CallableBox(:var item): print(item()); }
  print(item());
}
void constantRecords(Object input) {
  switch (input) {
    case const (item:1): print(1);
    case const (first:1,item:1): print(2);
  }
}
void main() { inspect(); shorthand(); constantRecords((item:1)); }
