class Box { const Box(); static const field=Box(); static Box create<T>(T value)=>Box(); }
void accept(Box value){}
void inspect(int Function() create,int Function() field){accept(.create<int>(create()));accept(.create(field()));accept(.field);create();field();}
void main(){inspect(()=>1,()=>2);}
