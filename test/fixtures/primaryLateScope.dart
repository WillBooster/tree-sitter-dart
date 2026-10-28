int target(){print('global');return 9;} class PC(int target){late final int value=target();} void main(){print(PC(7).value);}
