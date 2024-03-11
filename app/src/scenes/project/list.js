import { Formik } from "formik";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useHistory } from "react-router-dom";

import Loader from "../../components/loader";
import LoadingButton from "../../components/loadingButton";
import ProgressBar from "../../components/ProgressBar";

import api from "../../services/api";

const ProjectList = () => {
  const [projects, setProjects] = useState(null);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const history = useHistory();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/project");
      setProjects(data);
    })();
  }, []);

  useEffect(() => {
    let result = projects || [];
    if (statusFilter) {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (searchQuery) {
      result = result.filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    setFilteredProjects(result);
  }, [projects, statusFilter, searchQuery]);

  if (!projects) return <Loader />;

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };

  const renderProjects = (status) => {
    return filteredProjects
      .filter((project) => project.status === status)
      .map((project) => (
        <div
          key={project._id}
          onClick={() => history.push(`/project/${project._id}`)}
          className="flex justify-between flex-wrap p-3 border border-[#FFFFFF] bg-[#F9FBFD] rounded-[16px] mt-3 cursor-pointer">
          <div className="flex w-full md:w-[25%] border-r border-[#E5EAEF]">
            <div className="flex flex-wrap gap-4 items-center">
              {project.logo && <img className="w-[85px] h-[85px] rounded-[8px] object-contain	" src={project.logo} alt="ProjectImage.png" />}
              <div className="flex flex-col flex-wrap flex-1">
                <div className="text-[18px] text-[#212325] font-semibold flex flex-wrap">{project.name}</div>
              </div>
            </div>
          </div>
          <div className="w-full md:w-[50%] border-r border-[#E5EAEF] pl-[10px]">
            <span className="text-[14px] font-medium text-[#212325]">{project.description ? project.description : ""}</span>
          </div>
          <div className="w-full md:w-[25%]  px-[10px]">
            <span className="text-[16px] font-medium text-[#212325]">Budget consumed {project.paymentCycle === "MONTHLY" && "this month"}:</span>
            <Budget project={project} />
          </div>
        </div>
      ));
  };

  const FilterStatus = ({ statusFilter, setStatusFilter }) => {
    return (
      <div className="flex">
        <select
          className="w-[180px] bg-[#FFFFFF] text-[14px] text-[#212325] font-normal py-2 px-[14px] rounded-[10px] border-r-[16px] border-[transparent] cursor-pointer"
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}>
          <option disabled>Status</option>
          <option value={""}>All status</option>
          {[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ].map((e) => {
            return (
              <option key={e.value} value={e.value} label={e.label}>
                {e.label}
              </option>
            );
          })}
        </select>
      </div>
    );
  };

  return (
    <div>
      {/* Container */}
      <div className="pt-6 px-2 md:px-8">
        <div className="flex flex-col-reverse md:flex-row justify-between items-center">
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative text-[#A0A6B1]">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2">
                <button type="submit" className="p-1">
                  <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" className="w-5 h-5">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </button>
              </span>
              <input
                type="search"
                name="q"
                className="py-2 w-[364px] text-[14px] font-normal text-[black] rounded-[10px] bg-[#F9FBFD] border border-[#FFFFFF] pl-10"
                placeholder="Search"
                onChange={handleSearch}
              />
            </div>
            <FilterStatus statusFilter={statusFilter} setStatusFilter={setStatusFilter} />
          </div>
          <Create onChangeSearch={handleSearch} setProjects={setProjects} />
        </div>
        <div className="overflow-x-auto">
          {statusFilter !== "inactive" && (
            <div className="py-3">
              <h2 className="text-[22px] font-semibold mb-4">Active Projects</h2>
              {renderProjects("active")}
            </div>
          )}
          {statusFilter !== "active" && (
            <div className="py-3">
              <h2 className="text-[22px] font-semibold mb-4">Inactive Projects</h2>
              {renderProjects("inactive")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Budget = ({ project }) => {
  const [activities, setActivities] = useState([]);
  const [totalBudget, setTotalBudget] = useState(0);

  useEffect(() => {
    (async () => {
      let d = new Date();
      let dateQuery = "";
      if (project.paymentCycle === "ONE_TIME") {
        d = new Date(project.created_at);
        dateQuery = "gte:";
      }
      const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
      const activitiesData = await api.get(`/activity?projectId=${encodeURIComponent(project._id)}&date=${dateQuery}${date.getTime()}`);

      const usersData = await api.get(`/user`);
      const users = usersData.data;
      
      const enrichedActivities = activitiesData.data.map(activity => {
        const user = users.find(user => user._id === activity.userId);
        return {
          ...activity,
          userSellPerDay: user ? user.sellPerDay : 0,
        };
      });

      setActivities(enrichedActivities);

      const total = enrichedActivities.reduce((acc, activity) => {
        return acc + (activity.total * activity.userSellPerDay);
      }, 0);

      setTotalBudget(total);
    })();
  }, [project]);

  const budget_max_monthly = project.budget_max_monthly;
  const width = (100 * totalBudget) / budget_max_monthly || 0;

  if (!project.budget_max_monthly) return <div className="mt-2 text-[24px] text-[#212325] font-semibold">{totalBudget.toFixed(2)}€</div>;
  return <ProgressBar percentage={width} max={budget_max_monthly} value={totalBudget} />;
};

const Create = ({ onChangeSearch, setProjects }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-[10px] ">
      <div className="flex justify-between flex-wrap">
        {/* Create New Button */}
        <button
          className="bg-[#0560FD] text-[#fff] py-[12px] px-[20px] rounded-[10px] text-[16px] font-medium"
          onClick={() => {
            setOpen(true);
          }}>
          Create new project
        </button>
      </div>

      {open ? (
        <div
          className=" absolute top-0 bottom-0 left-0 right-0 bg-[#00000066] flex justify-center p-[1rem] z-50 "
          onClick={() => {
            setOpen(false);
          }}>
          <div
            className="w-full md:w-[60%] max-h-[200px] bg-[white] p-[25px] rounded-md"
            onClick={(e) => {
              e.stopPropagation();
            }}>
            {/* Modal Body */}
            <Formik
              initialValues={{}}
              onSubmit={async (values, { setSubmitting }) => {
                try {
                  values.status = "active";
                  const { data: newProject } = await api.post("/project", values);
                  if (newProject) {
                    setProjects(currentProjects => [...currentProjects, newProject]); // Add the new project to the existing list
                    toast.success("Project created successfully!");
                    setOpen(false);
                  }
                } catch (e) {
                  console.error(e);
                  toast.error("An error occurred!");
                }
                setSubmitting(false);
              }}>
              {({ values, handleChange, handleSubmit, isSubmitting }) => (
                <React.Fragment>
                  <div className="w-full md:w-6/12 text-left">
                    <div>
                      <div className="text-[14px] text-[#212325] font-medium	">Name</div>
                      <input className="projectsInput text-[14px] font-normal text-[#212325] rounded-[10px]" name="name" value={values.name} onChange={handleChange} />
                    </div>
                    <LoadingButton
                      className="mt-[1rem] bg-[#0560FD] text-[16px] font-medium text-[#FFFFFF] py-[12px] px-[22px] rounded-[10px]"
                      loading={isSubmitting}
                      onClick={handleSubmit}>
                      Create
                    </LoadingButton>
                  </div>
                </React.Fragment>
              )}
            </Formik>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ProjectList;
