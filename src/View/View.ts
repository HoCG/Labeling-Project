import {Store} from "../Store/Store";
import {SVGNS} from "../Infrastructure/SVGNS";
import {Line} from "./Entities/Line/Line";
import {Font} from "./Font";
import {LabelView} from "./Entities/LabelView/LabelView";
import {Annotator} from "../Annotator";
import {Label} from "../Store/Label";
import {ContentEditor} from "./Entities/ContentEditor/ContentEditor";

export interface Config extends LabelView.Config {
    readonly contentClasses: Array<string>;
    // svg barely support anything!
    // we don't have lineHeight, padding, border-box, etc
    // bad for it
    readonly lineHeight: number;
    readonly topContextMargin: number;
    // todo: merge this into store.labelCategory.color
    readonly labelOpacity: number;
    readonly contentEditable: boolean;
}


export class View {
    readonly contentFont: Font.ValueObject;
    readonly labelFont: Font.ValueObject;
    readonly topContextLayerHeight: number;
    readonly textElement: SVGTextElement;
    readonly lines: Array<Line.ValueObject>;
    readonly lineMaxWidth: number;
    readonly lineBeginEndWidth : number;
    readonly labelViewRepository: LabelView.Repository;
    readonly store: Store;

    readonly contentEditor: ContentEditor = null as any;

    constructor(
        readonly root: Annotator,
        readonly svgElement: SVGSVGElement,
        readonly config: Config
    ) {
        this.store = root.store;
        this.labelViewRepository = new LabelView.Repository();
        this.textElement = document.createElementNS(SVGNS, 'text') as SVGTextElement;
        this.textElement.style.alignmentBaseline = "middle";
        this.textElement.style.wordWrap = "normal";
        this.textElement.style.whiteSpace="pre"
        this.svgElement.appendChild(this.textElement);
        const labelText = Array.from(this.store.labelCategoryRepo.values()).map(it => it.text).join('');
        [this.contentFont, this.labelFont] = Font.Factory.startBatch(svgElement, this.textElement)
            .thanCreate(config.contentClasses, this.store.content)
            .thanCreate(config.labelClasses, labelText)
            .endBatch();
        //????????? ???????????? ???????????? ???????????? ??????
        this.topContextLayerHeight = config.topContextMargin; 
        this.textElement.classList.add(...config.contentClasses);
        this.lineMaxWidth = svgElement.width.baseVal.value - 2 * this.paddingLeft;
        //???????????? divide??? ????????????. ????????? divide ????????? ????????? ?????? ??????????????? ????????????.
        this.lines = Line.Service.divide(this, 0, this.store.content.length);
        this.constructLabelViewsForLine(this.lines);
        const tspans = this.lines.map(it => it.render());
        this.textElement.append(...tspans);
        this.svgElement.style.height = this.height.toString() +'px';
        this.svgElement.setAttribute('viewBox','0 -20 '+ (svgElement.width.baseVal.value)+' '+ (this.height+30).toString());
        
        //???????????? ?????? ??????.
        this.registerEventHandlers();
        if (this.config.contentEditable) {
            this.contentEditor = new ContentEditor(this);
            let [cursor, textArea] = this.contentEditor.render();
            this.svgElement.appendChild(cursor);
            this.svgElement.parentNode!.insertBefore(textArea, this.svgElement);
        }
        this.svgElement.appendChild(this.collectStyle());
    }

    private static layoutTopContextsAfter(currentLine: Line.ValueObject) {
        while (currentLine.next.isSome) {
            currentLine.topContext.update();
            currentLine = currentLine.next.toNullable()!;
        }
        currentLine.topContext.update();
    }

    //????????? ????????? ?????? ???????????? ??????.
    private constructLabelViewsForLine(lines: Array<Line.ValueObject>){
        //this.store.labelRepo??? ?????? ???????????? ????????? ?????? ??????????????? ??????.
        let labelViews = null;
        let saveLabel = Array;
        let checkFirstArray = new Array<boolean>();
        let saveLabelPoint = 0;
        for(let makesaveLabel = 0; makesaveLabel < this.store.labelRepo.length; ++makesaveLabel){
            saveLabel[makesaveLabel] = null;
        }

        for(let save_push = 0; save_push < this.store.labelRepo.length; ++save_push){
            checkFirstArray[save_push] = false;
        }
        
        for(const entityLines of lines){
            const labels = this.store.labelRepo.getEntitiesInRange(entityLines.startIndex, entityLines.endIndex);
            for(let save_push = this.store.labelRepo.length - 1; save_push >= 0; --save_push){ 
                //??????????????? ??????, ?????? ???????????? ????????? ??????. ????????? ?????? ????????? ????????? ?????????
                //????????? ??? ?????? ????????? ????????? ????????? ?????? ???????????? ????????? ???????????? ????????? ??????.
                if(saveLabel[save_push] !== null){
                    labels.unshift(saveLabel[save_push]);
                    saveLabel[save_push] = null;
                }
            }
            for(const entityLabels of labels){
                if(entityLabels.endIndex > entityLines.endIndex){
                    saveLabel[saveLabelPoint] = new Label.Entity(entityLabels.id, entityLabels.categoryId, entityLines.endIndex + 1, entityLabels.endIndex, this.store);
                    labelViews = new LabelView.Entity(new Label.Entity(entityLabels.id, entityLabels.categoryId, entityLabels.startIndex, entityLines.endIndex, this.store),
                    entityLines.topContext, this.config, checkFirstArray[entityLabels.id]);
                    checkFirstArray[entityLabels.id] = true;
                    ++saveLabelPoint;
                    this.labelViewRepository.add(labelViews);
                    entityLines.topContext.addChild(labelViews);
                }
                else{
                    labelViews = new LabelView.Entity(entityLabels, entityLines.topContext, this.config, checkFirstArray[entityLabels.id]);
                    this.labelViewRepository.add(labelViews); 
                    entityLines.topContext.addChild(labelViews);
                }
            }
            saveLabelPoint = 0;
        }
    }


    private get height() {
        return this.lines.reduce((currentValue, line) => currentValue + line.height + this.contentFont.fontSize * (this.config.lineHeight - 1), 20);
    }

    public contentWidth(startIndex: number, endIndex: number): number {
        return this.contentFont.widthOf(this.store.contentSlice(startIndex, endIndex));
    }

    private registerEventHandlers() {
        this.textElement.onmouseup = (e) => {
            if (window.getSelection()!.type === "Range") {
                this.root.textSelectionHandler.textSelected();
            } else {
                if (this.config.contentEditable)
                    this.contentEditor.caretChanged(e.clientY);
            }
        };
        this.store.labelRepo.on('created', this.onLabelCreated.bind(this));
        this.store.labelRepo.on('removed', (label: Label.Entity) => {
            //remove??? ??????, ????????? ????????? ?????? ????????? ???????????????. ???????????? ???????????? ?????? ?????????.
            //????????? ????????????!!!!!!!!!!!!!!!!!!!!!!!!?????????!!!!!!!!!!
            //????????? ??????????????? ??????!
            let viewEntity = this.labelViewRepository.getAll(label.id!);
            for (const entity of viewEntity) {
                entity.lineIn.topContext.removeChild(entity);
                entity.remove();         
                while(this.labelViewRepository.get(label.id!).id === undefined){
                    this.labelViewRepository.delete(entity);  
                } 
                entity.lineIn.topContext.update();
                entity.lineIn.update();
                View.layoutTopContextsAfter(entity.lineIn);
                if (this.config.contentEditable)
                    this.contentEditor.update();      
            }
        });
    }


    private MakeDivideLongLabel(startInLineIndex: number, endInLineIndex: number, label: Label.Entity) {
        let checkFirst = false;
        for(let i = startInLineIndex; i < endInLineIndex; i++ ){
            let LongLabel = label;
            if(i === startInLineIndex){
                LongLabel = new Label.Entity(label.id, label.categoryId, label.startIndex, this.lines[i].endIndex, this.store);
            }
            else if(i === endInLineIndex - 1){
                LongLabel = new Label.Entity(label.id, label.categoryId, this.lines[i].startIndex, label.endIndex, this.store);
            }
            else{
                LongLabel = new Label.Entity(label.id, label.categoryId, this.lines[i].startIndex, this.lines[i].endIndex, this.store);
            }
            //????????? ?????? ???????????????. ????????? ?????????. 
            //Repository.add ??????????????? ????????? ????????? ????????? ???????????? ????????????.
            const line = this.lines[i];
            const labelView = new LabelView.Entity(LongLabel, line.topContext, this.config, checkFirst);
            checkFirst = true;
            //???????????? ????????? ????????????...?
            //?????? ????????????! ???????????? ???????????? ???????????? ??????????????? ????????? ????????? ???????????????!
            this.labelViewRepository.add(labelView);
            line.topContext.addChild(labelView);
            line.topContext.renderChild(labelView);
            line.topContext.update();
            line.update();
            /* For Test.
            console.warn(`line "${i}'s id:"${this.labelViewRepository.get(testLabel.id).id}"`);
            */
        }
    }

    //???????????? ?????? ???????????? ???????????? ???????????????.
    private onLabelCreated(label: Label.Entity) {
        let [startInLineIndex, endInLineIndex] = this.findRangeInLines(label.startIndex, label.endIndex);
        //startInLineIndex??? ????????? ???????????? endInLineIndex??? ???????????? ????????? ??????.
        //in one line
        if (endInLineIndex === startInLineIndex + 1) {
            console.warn(`onLabelCreated-Method's startInLineIndex ,endInLineIndex:"${startInLineIndex}, ${endInLineIndex}"! When if (endInLineIndex === startInLineIndex + 1)`);
            const line = this.lines[startInLineIndex];
            const labelView = new LabelView.Entity(label, line.topContext, this.config, false);
            this.labelViewRepository.add(labelView);
            line.topContext.addChild(labelView);
            line.topContext.renderChild(labelView);
            line.topContext.update();
            line.update();
        } else {
            // in many lines
            //????????? ???????????? ???????????? ????????? ?????????. ????????? ??????????????? ???????????? ????????????.
            this.MakeDivideLongLabel(startInLineIndex, endInLineIndex, label);
        }
        View.layoutTopContextsAfter(this.lines[startInLineIndex]);
        if (this.config.contentEditable)
            this.contentEditor.update();
        this.svgElement.style.height = this.height.toString() + 'px';
    }

    private findRangeInLines(startIndex: number, endIndex: number) {
        let startInLineIndex: number = 0;
        let endInLineIndex: number = 0;
        this.lines.forEach((line: Line.ValueObject, index: number) => {
            if (line.startIndex <= startIndex && startIndex < line.endIndex) {
                startInLineIndex = index;
            }
            if (line.startIndex <= endIndex - 1 && endIndex - 1 < line.endIndex) {
                endInLineIndex = index + 1;
            }
        });
        return [startInLineIndex, endInLineIndex];
    }

    private collectStyle(): SVGStyleElement {
        const element = document.createElementNS(SVGNS, "style");
        const textClassSelector = this.config.contentClasses.map(it => "." + it)
            .join(',');
        // F*** SVG's LINE HEIGHT
        //
        // When you need it,
        // No affect it takes.
        // When you don't need it,
        // It makes things in a mess.
        // What is it?
        // line-height in <svg>s.
        const textStyle = `
        ${textClassSelector} {
            font-family: ${this.contentFont.fontFamily};
            font-weight: ${this.contentFont.fontWeight};
            font-size: ${this.contentFont.fontSize}px;
            line-height: ${this.contentFont.lineHeight}px;
        }
        `;
        const labelClassSelector = this.config.labelClasses.map(it => "." + it)
            .join(',');
        const labelStyle = `
        ${labelClassSelector} {
            font-family: ${this.labelFont.fontFamily};
            font-weight: ${this.labelFont.fontWeight};
            font-size: ${this.labelFont.fontSize}px;
        }
        `;

        element.innerHTML = textStyle + labelStyle;
        return element;
    }

    get paddingLeft(): number {
        return Math.max(...Array.from(this.store.labelCategoryRepo.values())
            .map(it => this.labelFont.widthOf(it.text))) / 2 + 1/* stroke */;
    }
}
