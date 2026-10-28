void target() {}
void cb() {}
void hidden() {}
void T() {}
typedef void Legacy(int target);
typedef void Callback(void cb(int hidden));
typedef Modern<T> = T Function(T value);
typedef T LegacyGeneric<T>(T value);
typedef void Nested(void cb(void nested(int hidden)));
Legacy? first;
Callback? second;
Modern<int>? third;
LegacyGeneric<int>? fourth;
Nested? fifth;
void main() { target(); cb(); hidden(); T(); }
