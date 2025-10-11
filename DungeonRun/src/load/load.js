export class Loader{
    constructor(){
        this.available = true;
        //append loader to the screen
        const parent = document.querySelector("body");
        if (!parent){
            alert("The document has no body");
            return;
        }
        this.load = document.createElement("section");

        this.load.style.background = "black"
        this.load.style.position = "fixed";
        this.load.style.zIndex = 10000;
        this.load.style.height = "100vh";
        this.load.style.width = "100vw";
        this.load.style.top = 0;
        this.load.style.left =0;
        this.load.style.display= "flex";
        this.load.style.flexDirection= "column";
        this.load.style.alignItems= "center";

        parent.appendChild(this.load);

        //create
        //title
        this.title = document.createElement("h1");
        
        this.title.textContent = "Dungeon Run!";

        this.title.style.zIndex = 10000;
        this.title.style.margin= "20px 0";
        this.title.style.fontSize= "3em";
        this.title.style.textShadow= "0 0 10px #ff0000, 0 0 20px #ff4500";
        this.title.style.letterSpacing= "3px";
        this.title.style.animation= "titleGlow 2s ease-in-out infinite alternate";
        this.load.append(this.title);

        //Image
        this.image = document.createElement("img");
        this.image.src = "https://th.bing.com/th/id/R.8d265d06810bb23aaae03aa276b30a20?rik=upp2sunhwE%2fQqw&riu=http%3a%2f%2fsimonbarle.com%2fWork%2fDungeon%2fDungeon_02.jpg&ehk=885U4xuDV59JBQKxOWtfpgFEvj05JRhhND%2fIwDDlTxw%3d&risl=&pid=ImgRaw&r=0";
        this.load.append(this.image);

        //loading border
        this.loadBar = document.createElement("section");
        this.loadBar.style.zIndex = 10000;
        this.loadBar.style.position = "fixed";
        this.loadBar.style.bottom = 0;
        this.loadBar.style.left = 0;
        this.loadBar.style.background = "white";
        this.loadBar.style.width = "1vw";
        this.loadBar.style.height = "2vh";

        this.load.append(this.loadBar);

    }
    update(percent = 77){
        percent = Math.abs(percent);
        if (percent>=100){
            this.load.remove();
            return;
        }
        this.loadBar.style.width = `${percent}vw`
    }
    remove(){
        if (!this.available) return;
        this.load.remove();
        this.available = false;
    }
    exist(){
        return this.available;
    }
}