"use client";

import { useState } from "react";
import RegistryTable from "@/components/puz/RegistryTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PuzCondition } from "@/types/puz";

const PuzRegistryPage = () => {
  const [selectedCondition, setSelectedCondition] =
    useState<PuzCondition>("АГ");

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Реестр ПУЗ</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Состояние:</label>
          <Select
            value={selectedCondition}
            onValueChange={(value) =>
              setSelectedCondition(value as PuzCondition)
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Выберите состояние" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="АГ">АГ (Артериальная гипертензия)</SelectItem>
              <SelectItem value="СД">СД (Сахарный диабет)</SelectItem>
              <SelectItem value="ХСН">
                ХСН (Хроническая сердечная недостаточность)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <RegistryTable condition={selectedCondition} />
    </div>
  );
};

export default PuzRegistryPage;
