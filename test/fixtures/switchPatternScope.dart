int target()=>9;
int other()=>8;
void inspect(int Function() value,int Function() another) {
  final simple=switch(value){var target when target()>0=>target(),_=>target()};target();
  final record=switch((value,)){(var target,) when target()>0=>target(),_=>target()};target();
  final logical=switch(value){var target || var target when target()>0=>target(),_=>target()};target();
  final nested=switch(value){var target=>switch(another){var other when other()>0=>target()+other(),_=>target()+other()}};target();other();
  print([simple,record,logical,nested]);
}
void main(){inspect(()=>1,()=>0);}
