//for accordion
var acc = document.getElementsByClassName("accordion");
var i;
for (i = 0; i < acc.length; i++) {
    acc[i].addEventListener("click", function() {
        this.classList.toggle("A");
        var panel = this.nextElementSibling;
        if (panel.style.maxHeight > "0vh") {
            panel.style.maxHeight = "0vh";
        } else {
            panel.style.maxHeight = "100vh";
        }
    });
}
//for accordion
var acc = document.getElementsByClassName("accordion2");
var i;
for (i = 0; i < acc.length; i++) {
    acc[i].addEventListener("click", function() {
        this.classList.toggle("A2");
        var panel = this.nextElementSibling;
        if (panel.style.maxHeight > "0vh") {
            panel.style.maxHeight = "0vh";
        } else {
            panel.style.maxHeight = panel.scrollHeight + "vh";
        }
    });
}