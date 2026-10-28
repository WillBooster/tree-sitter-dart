int target()=>9;
int other()=>8;
class Receiver { void run(int value) {} }
void basic(int Function() value) {
  if(value case var target when target()>0){target();}else{target();}target();
  if(value case var target)target();else target();target();
  if(value case var target)target();target();
}
void logical(int Function() value) {
  if(value case var target && var other when target()>0 && other()>0){target();other();}else{target();other();}target();other();
  if(value case var target || var target when target()>0){target();}else{target();}target();
}
void nested(int Function() first,int Function() second) {
  if(first case var target when target()>0){
    if(second case var other when other()>0){target();other();}else{target();other();}
    target();other();
  }else if(second case var other when other()>0){target();other();}else{target();other();}
  target();other();
}
void closures(int Function() value) {
  if(value case var target when (()=>target())()>0){
    (()=>target())();
    {int target()=>1;target();}
    target();
  }else{target();}
  target();
}
List<int> list(int Function() value)=>[
  if(value case var target when target()>0)target() else target(),target(),
  if(value case var target && var other)target()+other() else target()+other(),target(),other(),
  if(value case var target)...[target()] else ...[target()],target(),
];
Map<int,int> map(int Function() value)=>{
  if(value case var target when target()>0)target():target() else target():target(),target():target(),
};
Set<int> set(int Function() value)=>{
  if(value case var target)target() else target(),target(),
};
List<Object> cascade((Receiver,int Function()) value)=>[
  if(value case(var receiver,var other))receiver..run(other()) else Receiver()..run(other()),other(),
];
void main(){basic(()=>1);logical(()=>1);nested(()=>1,()=>1);closures(()=>1);list(()=>1);map(()=>1);set(()=>1);cascade((Receiver(),()=>1));}
