void T(){print('global T');}
T identity<T>(T value)=>value;
class PF(final T callback<T>(T value)){
 final marker=(){T();return 0;}();
 this{callback(1);T();}
 void m(){callback(2);T();}
}
class PT(T this.callback<T>(T value)){
 final T Function<T>(T) callback;
 final marker=(){T();return 0;}();
 this{callback(1);T();}
 void m(){callback(2);T();}
}
void main(){PF(identity).m();PT(identity).m();}
