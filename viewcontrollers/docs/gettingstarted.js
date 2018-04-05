class gettingstarted{

    onLoad(data){
        
       
        // var isLoggedIn = $i.Cache.Data('IsLoggedIn');
        // if (!isLoggedIn){
        //     $i.lock();
        // }
        // var editor1 = CodeMirror.fromTextArea($('.code_javascript')[0], {
        //     lineNumbers: true,
        //     mode : "javascript"
        // });

        var editor2 = CodeMirror.fromTextArea($('.code_htmlmixed')[0], {
            lineNumbers: true,
            mode : "htmlmixed",
            height : "40em"
        });
        editor2.setSize('100%', '50em');
        
    }
    onRefresh(){
        
    }

}