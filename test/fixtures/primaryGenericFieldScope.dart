void T(){} void U(){}
class PF(final T callback<T>(T value)) {
 final direct=callback(1);
 this {callback(2);T();}
 void m(){callback(3);T();}
}
class PT(T this.callback<T>(T value)) {
 final T Function<T>(T) callback;
 final direct=callback(1);
 this {callback(2);T();}
 void m(){callback(3);T();}
}
void use(T callback<T>(U nested<U>(U value),T value)){T();U();}
void main(){}
