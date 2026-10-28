int target() => 9;
class PC(int Function() target) {
 final direct=target();
 final closure=()=>target();
 final shadow=(){int target()=>2;return target();};
 static /* split */ final staticValue=target();
 late /* split */ int lateValue=target();
 covariant /* split */ late int covariantLate=target();
 covariant int regular=target();
 void m(){target();}
}
class PF(final int target(int value)) {
 final direct=target(1);
 this {target(2);}
 void m(){target(3);}
}
class PT(int this.target(int value)) {
 final int Function(int) target;
 final direct=target(1);
 this {target(2);}
 void m(){target(3);}
}
void main(){PC(()=>1);PF((x)=>x);PT((x)=>x);}
