extension CallableTrace on StackTrace { int call() => 1; }
int target()=>9;
int trace()=>8;
int other()=>7;
void basic(){
 try{throw ()=>2;}on int Function() catch(target,trace) /* handler */ /** documentation */ // line
 {
  target();trace();
  (()=>target())();
  {int target()=>3;target();}
  target();
 }on String catch(text){target();trace();}
 finally{target();trace();}target();trace();
}
void nested(){
 try{throw ()=>2;}on int Function() catch(target,trace){
  try{throw ()=>3;}on int Function() catch(other) // nested
  {target();other();trace();}
  other();target();
 }target();other();trace();
}
void untyped(){
 try{throw 1;}catch(target,trace) /* untyped */ {print(target);trace();}target();trace();
}
void main(){basic();nested();untyped();}
