int forwarding() => 9;
int ordinary() => 8;
class B(int Function() forwarding);
class C(super.forwarding, int Function() ordinary) extends B {
 final int forwarded = forwarding();
 final int plain = ordinary();
 this : assert(forwarding()==2 && ordinary()==3) {
  print([forwarded, plain, forwarding(), ordinary()]);
 }
 void m(){print([forwarding(), ordinary()]);}
}
void main(){C(()=>2,()=>3).m();}
