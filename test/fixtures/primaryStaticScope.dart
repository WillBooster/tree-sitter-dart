int target(){print('global');return 9;} class PC(int target){static final int value=target();final int stored=target;} void main(){print(PC(7).stored);print(PC.value);}
