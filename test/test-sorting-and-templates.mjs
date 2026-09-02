import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testSortingAndTemplates() {
  console.log("==================================================================");
  console.log("TESTING NATURAL NUMERIC SORTING & UNIQUE QR CARD RANGES");
  console.log("==================================================================");

  const rawList = [
    { designatedNumber: "100", name: "Domingo, Mercy" },
    { designatedNumber: "1", name: "Astorga, Jonel" },
    { designatedNumber: "10", name: "Domingo, Luisito" },
    { designatedNumber: "2", name: "Atentar, Ofelia" },
    { designatedNumber: "101", name: "Domingo, Myra" },
    { designatedNumber: "20", name: "Mangaoang, Jennefer" },
    { designatedNumber: "3", name: "Avellano, Luigene" },
    { designatedNumber: "102", name: "Domingo, Nida" },
    { designatedNumber: "4", name: "Boneo, Jocelyn" },
  ];

  // Natural numeric sort algorithm
  const sorted = [...rawList].sort((a, b) => {
    const numA = parseInt(a.designatedNumber, 10);
    const numB = parseInt(b.designatedNumber, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return String(a.designatedNumber).localeCompare(String(b.designatedNumber), undefined, { numeric: true });
  });

  console.log("Original Unsorted Order:");
  console.log(" ", rawList.map((x) => `#${x.designatedNumber}`).join(", "));

  console.log("\nNatural Numerically Sorted Order:");
  console.log(" ", sorted.map((x) => `#${x.designatedNumber}`).join(", "));

  const expectedOrder = ["1", "2", "3", "4", "10", "20", "100", "101", "102"];
  const isCorrect = sorted.every((item, idx) => item.designatedNumber === expectedOrder[idx]);

  if (isCorrect) {
    console.log("\n>>> PASS: Natural Numeric Sorting is 100% accurate! <<<");
  } else {
    console.error("\n>>> FAIL: Sorting order mismatch! <<<");
  }

  // Test range filter
  const range1to10 = sorted.filter((x) => {
    const n = parseInt(x.designatedNumber, 10);
    return n >= 1 && n <= 10;
  });
  console.log("\nRange #1 to #10 Filter:", range1to10.map((x) => `#${x.designatedNumber}`).join(", "));

  const range100to102 = sorted.filter((x) => {
    const n = parseInt(x.designatedNumber, 10);
    return n >= 100 && n <= 102;
  });
  console.log("Range #100 to #102 Filter:", range100to102.map((x) => `#${x.designatedNumber}`).join(", "));

  console.log("==================================================================");
}

testSortingAndTemplates();
